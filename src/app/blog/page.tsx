import { Suspense } from "react";
import { getBlogPosts, getLabels, getTotalBlogPostsCount } from "@/lib/blog";
import BlogListingClient from "@/app/components/BlogListingClient";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

async function BlogListingPage({
  searchParams,
}: {
  searchParams: { page?: string; label?: any };
}) {
  const page = Number(searchParams.page) || 1;
  const label = searchParams.label;

  const postsData = getBlogPosts({ page, label });
  const labelsData = getLabels();
  const totalCountData = getTotalBlogPostsCount(label);

  const [posts, labels, totalCount] = await Promise.all([
    postsData,
    labelsData,
    totalCountData,
  ]);

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Blog Posts</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <BlogListingClient
          initialPosts={posts}
          labels={labels}
          initialPage={page}
          initialLabel={label}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}

export default BlogListingPage;
