"use client";

import { useState, FormEvent } from "react";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";

interface Comment {
  id: number;
  name: string;
  content: string;
  createdAt: string;
}

interface BlogPostClientProps {
  postId: number;
  initialComments: Comment[];
}

export default function BlogPostClient({
  postId,
  initialComments,
}: BlogPostClientProps) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState({ name: "", content: "" });

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newComment, postId }),
      });
      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment({ name: "", content: "" });
      } else {
        console.error("Failed to submit comment");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = "Check out this blog post!";

  return (
    <div>
      <div>
        <h2>Share this post</h2>
        <div>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              shareUrl
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaFacebookF />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
              shareUrl
            )}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaTwitter />
          </a>
          <a
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
              shareUrl
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedinIn />
          </a>
        </div>
      </div>

      <h2>Comments</h2>
      {comments.map((comment) => (
        <div key={comment.id}>
          <p>{comment.name}</p>
          <p>{comment.content}</p>
          <p>{new Date(comment.createdAt).toLocaleString()}</p>
        </div>
      ))}

      <form onSubmit={handleSubmitComment}>
        <h3>Add a comment</h3>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={newComment.name}
            onChange={(e) =>
              setNewComment({ ...newComment, name: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label htmlFor="content">Comment</label>
          <textarea
            id="content"
            value={newComment.content}
            onChange={(e) =>
              setNewComment({ ...newComment, content: e.target.value })
            }
            required
            rows={4}
          />
        </div>
        <button type="submit">Submit Comment</button>
      </form>
    </div>
  );
}
