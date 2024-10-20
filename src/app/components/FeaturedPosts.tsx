import { getFeaturedPosts } from "@/lib/blog";
import React from "react";
import { FiEye } from "react-icons/fi";
import styles from "@/app/styles/FeaturedPosts.module.css";
import Link from "next/link";

const gradientClasses = [
  styles.gradientPurplePink,
  styles.gradientCyanBlue,
  styles.gradientYellowOrange,
];

const FeaturedPosts: React.FC = async () => {
  const posts = await getFeaturedPosts(3);

  return (
    <div className={styles.featuredPosts}>
      <h3>Featured Posts</h3>
      {!posts.length && <p>There are not featured posts to display</p>}
      <div className={styles.grid}>
        {posts.map((post, index) => (
          <Link href={`/blog/${post.slug}`} key={index} className={styles.link}>
            <div
              key={index}
              className={`${styles.post} ${gradientClasses[index]}`}
            >
              <div className={styles.postContent}>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <div className={styles.viewsContainer}>
                  <FiEye className={styles.eyeIcon} />
                  <span>{post.views.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FeaturedPosts;
