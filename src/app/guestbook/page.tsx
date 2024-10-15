import { createGuestbook } from "@/lib/guestbook";
import GuestbookForm from "./GuestbookForm";

export default function Guestbook() {
  return (
    <>
      <h3 className={"mt-0-xs"}>Guestbook</h3>
      <p>
        I'd love to hear from you! Leave your thoughts, feedback, or just say
        hello — let’s stay connected and keep the conversation going!
      </p>
      <GuestbookForm createGuestbook={createGuestbook} />
    </>
  );
}
