import Link from "next/link";
import { getFeaturedPosts } from "@/lib/blog";
import React from "react";
import { FiEye } from "react-icons/fi";
import styles from "@/app/styles/FeaturedPosts.module.css";

interface Post {
  title: string;
  views: number;
  gradientClass: string;
}

const posts: Post[] = [
  {
    title:
      "Everything I Know About Style Guides, Design Systems, and Component Libraries",
    views: 154740,
    gradientClass: styles.gradientPurplePink,
  },
  {
    title: "Rust Is The Future of JavaScript Infrastructure",
    views: 230429,
    gradientClass: styles.gradientCyanBlue,
  },
  {
    title: "Past, Present, and Future of React State Management",
    views: 139854,
    gradientClass: styles.gradientYellowOrange,
  },
];

const FeaturedPosts: React.FC = async () => {
  const postsX = await getFeaturedPosts(4);

  return (
    <div className={styles.featuredPosts}>
      <h3>Featured Posts</h3>
      <div className={styles.grid}>
        {posts.map((post, index) => (
          <div key={index} className={`${styles.post} ${post.gradientClass}`}>
            <div className={styles.postContent}>
              <h3 className={styles.postTitle}>{post.title}</h3>
              <div className={styles.viewsContainer}>
                <FiEye className={styles.eyeIcon} />
                <span>{post.views.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedPosts;
