import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../../lib/mongodb";
import Voter from "../../../../models/Voter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    await dbConnect();

    // Get total voters count
    const totalVoters = await Voter.countDocuments();

    // Get verified voters count (assuming verified voters have mustChangePassword: false)
    const verifiedVoters = await Voter.countDocuments({ mustChangePassword: false });

    // Get recent registrations (last 10)
    const recentRegistrations = await Voter.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name rollNumber createdAt')
      .lean();

    // Format recent registrations
    const formattedRegistrations = recentRegistrations.map(voter => ({
      name: voter.name,
      rollNumber: voter.rollNumber,
      registeredAt: voter.createdAt || new Date()
    }));

    // Get voter status breakdown
    const voterStatusBreakdown = await Voter.aggregate([
      {
        $group: {
          _id: "$mustChangePassword",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusBreakdown = {
      newVoters: 0,
      activeVoters: 0
    };

    voterStatusBreakdown.forEach(item => {
      if (item._id === true) {
        statusBreakdown.newVoters = item.count;
      } else {
        statusBreakdown.activeVoters = item.count;
      }
    });

    // Get voters by registration date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyRegistrations = await Voter.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);

    // Format weekly registrations
    const formattedWeeklyRegistrations = weeklyRegistrations.map(item => ({
      date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
      count: item.count
    }));

    return res.status(200).json({
      success: true,
      totalVoters,
      recentRegistrations: formattedRegistrations,
      statusBreakdown,
      weeklyRegistrations: formattedWeeklyRegistrations
    });

  } catch (error) {
    console.error("Error fetching voter data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching voter data"
    });
  }
}