import CreatorNav from "@/components/CreatorNav";
import Navbar from "@/components/Navbar";

export default function CreatorProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <CreatorNav />
      {children}
    </>
  );
}
