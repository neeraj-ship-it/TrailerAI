import { useToast } from "@/hooks/useToast";
import { useUser } from "@/context/UserContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export const useLoginForm = () => {
  const { signInWithPassword, error } = useUser();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [_error, _setError] = useState(error);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setIsLoading(true);
      await signInWithPassword(values.email, values.password);
      setIsLoading(false);
    },
    [signInWithPassword]
  );

  useEffect(() => {
    if (error) {
      (async () => {
        if ("response" in error) {
          const errorResponse = await (error.response as Response)?.json();
          toast({
            variant: "destructive",
            title: errorResponse.message,
          });
        }
      })();

      _setError(error);
      const subscription = form.watch(() => {
        if (error) _setError(null);
      });
      return () => subscription.unsubscribe();
    }
  }, [error, toast, form]);

  return {
    form,
    handleSubmit,
    isLoading,
    error: _error,
  };
};
