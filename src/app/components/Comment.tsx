import React from "react";
import Image from "next/image";

interface CommentProps {
  author: string;
  avatarUrl: string;
  content: string;
  date: string;
}

const Comment: React.FC<CommentProps> = ({
  author,
  avatarUrl,
  content,
  date,
}) => {
  return (
    <div className="comment">
      <div className="comment-avatar">
        <Image src={avatarUrl} alt={author} width={40} height={40} />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">{author}</span>
          <span className="comment-date">{date}</span>
        </div>
        <p>{content}</p>
      </div>
    </div>
  );
};

export default Comment;
