"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WorflowImg01 from "@/public/images/workflow-01.png";
import WorflowImg02 from "@/public/images/workflow-02.png";
import WorflowImg03 from "@/public/images/workflow-03.png";
import Spotlight from "@/components/spotlight";

export default function Workflows() {
  const router = useRouter();

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pb-12 md:pb-20">
          {/* Section header */}
          <div className="mx-auto max-w-3xl pb-12 text-center md:pb-20">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                Voting system
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,theme(colors.gray.200),theme(colors.indigo.200),theme(colors.gray.50),theme(colors.indigo.300),theme(colors.gray.200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              Welcome!
            </h2>
            <p className="text-lg text-indigo-200/65">
              Hi, Voters you can vote Here securly and anonymously
            </p>
          </div>
          {/* Spotlight items */}
          <Spotlight className="group mx-auto grid max-w-sm items-start gap-6 lg:max-w-none lg:grid-cols-3">
            {/* Card 1 - Candidates List */}
            <div
              onClick={() => navigateTo("/candidates")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image
                  className="inline-flex"
                  src={WorflowImg01}
                  width={350}
                  height={288}
                  alt="Workflow 01"
                />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Candidates list
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    Here you can see the list of candidates and each of their
                    manifesto
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 - Voting Page */}
            <div
              onClick={() => navigateTo("/voting")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image
                  className="inline-flex"
                  src={WorflowImg02}
                  width={350}
                  height={288}
                  alt="Workflow 02"
                />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Vote securly!
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    Give your vote to your favorite candidate Here
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 - Results Page */}
            <div
              onClick={() => navigateTo("/results")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image
                  className="inline-flex"
                  src={WorflowImg03}
                  width={350}
                  height={288}
                  alt="Workflow 03"
                />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Results!
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    You can see winners of the election here
                  </p>
                </div>
              </div>
            </div>
          </Spotlight>
        </div>
      </div>
    </section>
  );
}
