import Link from "next/link";
import Image from "next/image";

interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  author: {
    name: string;
  };
  previewImage: string | null;
}

interface RelatedPostsProps {
  posts: RelatedPost[];
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <div>
      <h2>Related Posts</h2>
      <div>
        {posts.map((post) => (
          <Link href={`/blog/${post.slug}`} key={post.id}>
            <div>
              {post.previewImage && (
                <Image
                  src={post.previewImage}
                  alt={`Preview for ${post.title}`}
                  width={200}
                  height={150}
                  objectFit="cover"
                />
              )}
              <h3>{post.title}</h3>
              <p>By {post.author.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
