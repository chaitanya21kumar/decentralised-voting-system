"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WorflowImg01 from "@/public/images/workflow-01.png";
import WorflowImg02 from "@/public/images/workflow-02.png";
import WorflowImg03 from "@/public/images/workflow-03.png";
import Spotlight from "@/components/spotlight";
import VoterHeader from "@/components/ui/VoterHeader";
import axios from "axios";
import Features from "@/components/features";
import Cta from "@/components/cta";
import { showToast } from "../../pages/api/admin/showToast";

interface AdminInfo {
  name: string;
}

export default function SigninUsers() {
  const [signedIn, setSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<AdminInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isPending, startTransition] = useTransition(); // ⬅️ route transition tracking
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    axios
      .get("/api/admin/me")
      .then((res) => {
        if (res.data.authenticated) {
          setSignedIn(true);
          setUserInfo({ name: res.data.name });
        }
      })
      .catch(() => {
        setSignedIn(false);
        setUserInfo(null);
      });
  }, []);

  const navigateTo = (path: string) => {
    if (signedIn) {
      setLoadingRoute(true);
      startTransition(() => {
        router.push(path); // ⬅️ triggers navigation within transition
      });
    } else {
      showToast("You must be signed in.", "error");
    }
  };

  return (
    <section className="relative">
      <VoterHeader />

      {(loadingRoute || isPending) && (
        <div className="absolute inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 border-4 border-indigo-500 border-dashed rounded-full animate-spin"></div>
            <p className="text-indigo-300 font-medium text-sm">Navigating...</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pb-12 md:pb-20">
          <div className="mx-auto max-w-3xl pb-12 text-center md:pb-20">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                Voting System
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,theme(colors.gray.200),theme(colors.indigo.200),theme(colors.gray.50),theme(colors.indigo.300),theme(colors.gray.200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              Welcome{userInfo ? `, ${userInfo.name}` : "!"}
            </h2>
            <p className="text-lg text-indigo-200/65">
              "Hi, Voters! You can vote here securely and anonymously."
            </p>
          </div>

          <Spotlight className="group mx-auto grid max-w-sm items-start gap-6 lg:max-w-none lg:grid-cols-3">
            <div
              onClick={() => navigateTo("/candidates")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image src={WorflowImg01} width={350} height={288} alt="Candidates" />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Candidates List
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    See the list of candidates and their manifestos.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigateTo("/voter")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image src={WorflowImg02} width={350} height={288} alt="Voting" />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Vote Securely!
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    Give your vote to your favorite candidate.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigateTo("/results")}
              className="group/card relative h-full overflow-hidden rounded-2xl bg-gray-800 p-px cursor-pointer"
            >
              <div className="relative z-20 h-full overflow-hidden rounded-[inherit] bg-gray-950">
                <Image src={WorflowImg03} width={350} height={288} alt="Results" />
                <div className="p-6">
                  <div className="mb-3">
                    <span className="btn-sm rounded-full bg-gray-800/40 px-2.5 py-0.5 text-xs font-normal">
                      <span className="bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                        Results!
                      </span>
                    </span>
                  </div>
                  <p className="text-indigo-200/65">
                    View the election results here.
                  </p>
                </div>
              </div>
            </div>
          </Spotlight>
        </div>
      </div>

      <Features />
      <Cta />
    </section>
  );
}
