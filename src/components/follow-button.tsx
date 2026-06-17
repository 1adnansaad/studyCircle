"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { followAction } from "@/app/actions";
import { useApp } from "./app-shell";
import { CheckIcon } from "./icons";

export function FollowButton({ profileId, tag, isFollowing }: { profileId: string; tag: string; isFollowing: boolean }) {
  const router = useRouter();
  const { toast } = useApp();
  const [following, setFollowing] = useState(isFollowing);
  const [, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await followAction(profileId);
      if (res.ok) {
        setFollowing(res.following);
        toast(res.following ? `Following ${tag}` : `Unfollowed ${tag}`);
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: following ? "1.5px solid var(--ll-outline-variant)" : "none",
        cursor: "pointer", borderRadius: 999, fontWeight: 700, fontSize: 14, padding: following ? "9px 18px" : "10px 20px",
        background: following ? "transparent" : "var(--ll-secondary)",
        color: following ? "var(--ll-on-surface)" : "#fff",
        boxShadow: following ? "none" : "var(--ll-shadow-cta)",
      }}
    >
      {following && <CheckIcon size={15} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
