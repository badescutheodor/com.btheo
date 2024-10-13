import Link from "next/link";
import { getFeaturedPosts } from "@/lib/blog";
import styles from "@/app/styles/FeaturedPosts.module.css";

export default async function FeaturedPosts() {
  const featuredPosts = await getFeaturedPosts(4);

  return (
    <div className={styles.featuredPosts}>
      <h3>Featured Posts</h3>
      <div>
        {!featuredPosts.length && <p>No featured posts to show</p>}
        {featuredPosts.map((post) => (
          <Link href={`/blog/${post.slug}`} key={post.id}>
            <div>
              {post.previewImage && (
                <Image
                  src={post.previewImage}
                  alt={`Preview for ${post.title}`}
                  width={300}
                  height={200}
                  objectFit="cover"
                />
              )}
              <h3>{post.title}</h3>
              <p>By {post.author.name}</p>
              <p>{post.excerpt.substring(0, 100)}...</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
