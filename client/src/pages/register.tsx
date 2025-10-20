import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/instant";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import { id } from "@instantdb/react";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  organizationName: z.string().min(1, "Organization name is required"),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [formData, setFormData] = useState<RegisterInput | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      organizationName: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setFormData(data);
    try {
      await db.auth.sendMagicCode({ email: data.email });
      setSentEmail(true);
      toast({
        title: "Check your email",
        description: `We sent a verification code to ${data.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyCode = async () => {
    if (!formData) return;

    setIsVerifying(true);
    try {
      // Sign in with magic code
      await db.auth.signInWithMagicCode({
        email: formData.email,
        code
      });

      // Create organization and link user
      const organizationId = id();

      await db.transact([
        db.tx.organizations[organizationId].update({
          name: formData.organizationName,
        }),
      ]);

      // Get current user and link to organization
      const { user } = db.useAuth();
      if (user) {
        await db.transact([
          db.tx.$users[user.id].link({
            organization: organizationId
          })
        ]);
      }

      toast({
        title: "Account created",
        description: "Welcome! Your organization has been set up.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please check your code and try again",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">WhatsApp Dashboard</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              {sentEmail
                ? "Enter the verification code we sent to your email"
                : "Register as a super administrator to manage your organization"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sentEmail ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            data-testid="input-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Inc."
                            data-testid="input-organization"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "Sending code..." : "Create Account"}
                  </Button>

                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <a
                      href="/login"
                      className="text-primary hover:underline"
                      data-testid="link-login"
                    >
                      Sign in here
                    </a>
                  </p>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Verification Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={verifyCode}
                  className="w-full"
                  disabled={isVerifying || code.length !== 6}
                >
                  {isVerifying ? "Creating account..." : "Verify & Create Account"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setSentEmail(false);
                    setCode("");
                    setFormData(null);
                  }}
                  className="w-full"
                >
                  Use different email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
