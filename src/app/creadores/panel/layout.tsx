import CreatorNav from "@/components/CreatorNav";
import Navbar from "@/components/Navbar";

export default function CreatorPanelLayout({
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
