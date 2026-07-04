import { TravelCard } from "@/components/ui/card-7";
import { Toaster, toast } from "sonner";

// Demo component to showcase the TravelCard
export default function TravelCardDemo() {
  const handleBooking = () => {
    toast.success("Booking initiated!", {
      description: "Redirecting to booking page...",
    });
  };

  return (
    <>
      {/* The Toaster component is required to display the notifications */}
      <Toaster richColors />
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <TravelCard
          imageUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop"
          imageAlt="Misty mountains over a serene lake"
          title="Manhattan Green Camp"
          location="Cloud City, Atmosphere 78910, Planet Earth"
          overview="Discover nature where spacious campsites, scenic trails, and cozy campfires await. Perfect for families, friends, and solo adventurers."
          price={120}
          pricePeriod="Per Night"
          onBookNow={handleBooking}
          aria-label="Travel card for Manhattan Green Camp"
        />
      </div>
    </>
  );
}
