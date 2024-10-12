import { getBlogPostBySlug, getRelatedPosts } from "@/lib/blog";
import BlogPostClient from "@/app/components/BlogPostClient";
import RelatedPosts from "@/app/components/RelatedPosts";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: { slug: string; metaTags: any };
}): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Blog Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.metaTags?.description || post.content.substring(0, 160),
    openGraph: {
      title: post.metaTags?.ogTitle || post.title,
      description:
        post.metaTags?.ogDescription ||
        post.metaTags?.description ||
        post.content.substring(0, 160),
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      tags: post.labels.map((label) => label.name),
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTags?.title || post.title,
      description: post.metaTags?.description || post.content.substring(0, 160),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const relatedPosts = await getRelatedPosts(
    post.id,
    post.labels.map((label) => label.id)
  );

  return (
    <div>
      <h1>{post.title}</h1>
      <p>
        By {post.author.name} on {new Date(post.date).toLocaleDateString()}
      </p>
      <p>Read time: {post.readTime}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
      <BlogPostClient postId={post.id} initialComments={post.comments} />
      <RelatedPosts posts={relatedPosts} />
    </div>
  );
}
