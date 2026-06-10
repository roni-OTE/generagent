import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "404 · GenerAgent" };

export default function NotFound() {
  return (
    <ComingSoon
      eyebrow="404 · page not found"
      title="לא מצאנו את הדף הזה."
      description="הקישור שניסית אולי שונה, נמחק, או שמעולם לא היה כאן. בוא נחזיר אותך לדף הבית."
    />
  );
}
