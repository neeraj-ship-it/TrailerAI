import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full px-6 py-10 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="text-center">
          <div className="relative mx-auto w-32 h-32 mb-8">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-15"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-red-500 rounded-full">
              <ShieldX className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            403 - Forbidden
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Oops! You don{"'"}t have permission to access this page or perform
            this action.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button asChild className="w-full">
            <Link href="/" replace className="flex items-center justify-center">
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
