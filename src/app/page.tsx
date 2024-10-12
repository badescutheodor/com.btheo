import Image from "next/image";
import { Metadata } from "next";
import FeaturedPosts from "@/app/components/FeaturedPosts";

export const metadata: Metadata = {
  title: "Next.js",
};

export default function Home() {
  return (
    <div className="home">
      <div className="profile">
        <h1>Lee Robinson</h1>
        <p>VP of Developer Experience at Vercel</p>
        <FeaturedPosts />
      </div>
    </div>
  );
}
