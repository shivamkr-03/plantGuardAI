import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Leaf, Upload, History, Shield, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlantCare AI
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/predict">
                  <Button variant="ghost">Predict</Button>
                </Link>
                <Link to="/history">
                  <Button variant="ghost">History</Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline">Profile</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Plant Disease Detection</span>
          </div>
          
          <h1 className="text-6xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in slide-in-from-bottom-4 duration-1000">
              Protect Your Plants
            </span>
            <br />
            <span className="text-foreground animate-in slide-in-from-bottom-4 duration-1000 delay-100">
              with Smart Diagnosis
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-1000 delay-200">
            Upload a photo of your plant's leaf and get instant disease detection with AI-powered treatment recommendations. Save your crops, save your garden.
          </p>
          
          <div className="flex gap-4 justify-center animate-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Link to={user ? "/predict" : "/auth"}>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">
                <Upload className="w-5 h-5 mr-2" />
                Start Detection
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-secondary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Detection</h3>
            <p className="text-muted-foreground">
              Get disease predictions in seconds with our advanced CNN model trained on 38 plant diseases.
            </p>
          </Card>
          
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-secondary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Expert Recommendations</h3>
            <p className="text-muted-foreground">
              Receive detailed treatment plans with organic and chemical options tailored to your plant's needs.
            </p>
          </Card>
          
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-secondary/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <History className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track History</h3>
            <p className="text-muted-foreground">
              Save and track your predictions over time to monitor plant health patterns and trends.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
          <Shield className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-4xl font-bold mb-4">Ready to Protect Your Plants?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and gardeners using AI to keep their plants healthy and thriving.
          </p>
          <Link to={user ? "/predict" : "/auth"}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">
              Get Started Free
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 PlantCare AI. Built with AI to help farmers and gardeners worldwide.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;