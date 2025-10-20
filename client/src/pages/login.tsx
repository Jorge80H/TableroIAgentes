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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await db.auth.sendMagicCode({ email: data.email });
      setSentEmail(true);
      toast({
        title: "Check your email",
        description: `We sent a login code to ${data.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send login code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyCode = async () => {
    setIsVerifying(true);
    try {
      await db.auth.signInWithMagicCode({
        email: form.getValues("email"),
        code
      });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Invalid code",
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
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              {sentEmail
                ? "Enter the code we sent to your email"
                : "Enter your email to receive a login code"}
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Sending code..." : "Send Login Code"}
                  </Button>

                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <a
                      href="/register"
                      className="text-primary hover:underline"
                      data-testid="link-register"
                    >
                      Register here
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
                  {isVerifying ? "Verifying..." : "Verify Code"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setSentEmail(false);
                    setCode("");
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
