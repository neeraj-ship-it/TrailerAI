"use client";

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
import { useLoginForm } from "./hooks/useLoginForm";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export const Login = () => {
  const { form, handleSubmit, isLoading, error } = useLoginForm();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            Sign into Dashboard
          </h2>
        </div>
        <Card
          className={cn(error && "border-2 border-destructive animate-shake")}
        >
          <CardContent className="px-8 py-8 shadow-sm">
            <div>
              {/* {
                // @ts-expect-error
                error && error.response && error?.response?.status === 401 && (
                  <Alert variant="destructive" className="flex items-center">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="mt-1">
                      Invalid credentials.
                    </AlertDescription>
                  </Alert>
                )
              } */}
              <div className="relative"></div>
              <Form {...form}>
                <form
                  action="#"
                  method="POST"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="flex flex-col gap-2"
                >
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            className={cn(
                              fieldState.error && "!border-destructive"
                            )}
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage
                          className={fieldState.error ? "visible" : "invisible"}
                        >
                          {fieldState.error
                            ? fieldState.error.message
                            : "invalid"}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            className={cn(
                              fieldState.error && "!border-destructive"
                            )}
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage
                          className={fieldState.error ? "visible" : "invisible"}
                        >
                          {fieldState.error
                            ? fieldState.error.message
                            : "invalid"}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  <Button
                    className="w-full"
                    type="submit"
                    disabled={form.getValues().email === "" || isLoading}
                  >
                    Sign in
                  </Button>

                  {/* DEVELOPMENT MODE: Skip Login Button */}
                  <Button
                    className="w-full mt-4"
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/trailer/create')}
                  >
                    🚀 Continue to App (Skip Login)
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
