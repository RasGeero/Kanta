import { ShoppingBag, Heart, Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="gradient-bg p-4 rounded-lg">
              <ShoppingBag className="text-primary-foreground text-4xl h-12 w-12" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">About Kantamanto</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ghana's premier thrift marketplace connecting buyers and sellers of quality second-hand clothing
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                Quality Thrift Fashion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Discover unique, high-quality second-hand clothing from trusted sellers across Ghana.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                Sustainable Shopping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Reduce fashion waste by giving pre-loved clothes a new life while saving money.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Community Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect with local sellers and buyers in a safe, trusted marketplace environment.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mission Section */}
        <div className="bg-muted rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-center mb-6">Our Mission</h2>
          <p className="text-lg text-center text-muted-foreground max-w-4xl mx-auto">
            Kantamanto aims to revolutionize the thrift fashion industry in Ghana by providing a 
            modern, secure, and user-friendly platform that connects fashion enthusiasts with 
            quality second-hand clothing. We're building a sustainable fashion ecosystem that 
            benefits both buyers and sellers while promoting environmental consciousness.
          </p>
        </div>

        {/* Trust & Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Shield className="h-6 w-6 text-primary" />
              Trust & Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              We prioritize user safety with secure payment processing through Paystack and Mobile Money, 
              verified seller profiles, and comprehensive buyer protection policies.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}