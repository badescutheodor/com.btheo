import Link from "next/link";
import { getFeaturedPosts } from "@/lib/blog";

export default async function FeaturedPosts() {
  const featuredPosts = await getFeaturedPosts(4);

  return (
    <div>
      <h2>Featured Posts</h2>
      <div>
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
