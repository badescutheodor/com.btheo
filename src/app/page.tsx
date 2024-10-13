import { Metadata } from "next";
import FeaturedPosts from "@/app/components/FeaturedPosts";
import { getSettings } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Next.js",
};

export default async function Home() {
  const settings = await getSettings();

  return (
    <div className="home">
      <div className="profile">
        <h1>{settings.homeTitle}</h1>
        <p>{settings.homeDescription}</p>
        <FeaturedPosts />
      </div>
    </div>
  );
}
