"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

const intakeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(18, "You must be 18 or older").max(120, "Please enter a valid age"),
  mainConcern: z.string().min(10, "Please provide at least 10 characters"),
  phq2_1: z.enum(["0", "1", "2", "3"], {
    required_error: "Please select an option",
  }),
  phq2_2: z.enum(["0", "1", "2", "3"], {
    required_error: "Please select an option",
  }),
  gad2_1: z.enum(["0", "1", "2", "3"], {
    required_error: "Please select an option",
  }),
  gad2_2: z.enum(["0", "1", "2", "3"], {
    required_error: "Please select an option",
  }),
  emergencyContact: z.string().optional(),
})

type IntakeFormData = z.infer<typeof intakeSchema>

const frequencyOptions = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "Several days" },
  { value: "2", label: "More than half the days" },
  { value: "3", label: "Nearly every day" },
]

export function IntakeWizard() {
  const [step, setStep] = useState(1)
  const { toast } = useToast()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
  })

  const totalSteps = 5

  const onSubmit = async (data: IntakeFormData) => {
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to submit intake form")
      }

      toast({
        title: "Intake Complete!",
        description: "Welcome to Avilon. Let's begin your therapy journey.",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit intake form. Please try again.",
        variant: "destructive",
      })
    }
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Avilon</CardTitle>
          <CardDescription>
            Step {step} of {totalSteps} - Let's get to know you better
          </CardDescription>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">What's your name?</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age">How old are you?</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    {...register("age", { valueAsNumber: true })}
                  />
                  {errors.age && (
                    <p className="text-sm text-red-500 mt-1">{errors.age.message}</p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Label htmlFor="mainConcern">
                  What brings you here today? What would you like support with?
                </Label>
                <Textarea
                  id="mainConcern"
                  placeholder="Share what's on your mind..."
                  rows={6}
                  {...register("mainConcern")}
                />
                {errors.mainConcern && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.mainConcern.message}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Depression Screening (PHQ-2)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Over the last 2 weeks, how often have you been bothered by the following?
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Little interest or pleasure in doing things</Label>
                    <Select
                      value={watch("phq2_1")}
                      onValueChange={(value) =>
                        setValue("phq2_1", value as "0" | "1" | "2" | "3")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.phq2_1 && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.phq2_1.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Feeling down, depressed, or hopeless</Label>
                    <Select
                      value={watch("phq2_2")}
                      onValueChange={(value) =>
                        setValue("phq2_2", value as "0" | "1" | "2" | "3")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.phq2_2 && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.phq2_2.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Anxiety Screening (GAD-2)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Over the last 2 weeks, how often have you been bothered by the following?
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Feeling nervous, anxious, or on edge</Label>
                    <Select
                      value={watch("gad2_1")}
                      onValueChange={(value) =>
                        setValue("gad2_1", value as "0" | "1" | "2" | "3")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.gad2_1 && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.gad2_1.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Not being able to stop or control worrying</Label>
                    <Select
                      value={watch("gad2_2")}
                      onValueChange={(value) =>
                        setValue("gad2_2", value as "0" | "1" | "2" | "3")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.gad2_2 && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.gad2_2.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <Label htmlFor="emergencyContact">
                  Emergency Contact (Optional)
                </Label>
                <p className="text-sm text-gray-600">
                  Name and phone number of someone we could contact in case of emergency
                </p>
                <Textarea
                  id="emergencyContact"
                  placeholder="e.g., Jane Doe - (555) 123-4567"
                  rows={3}
                  {...register("emergencyContact")}
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm">
                    <strong>Important:</strong> Avilon is not a substitute for professional
                    mental health care. If you're experiencing a mental health crisis, please
                    call 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
              {step < totalSteps ? (
                <Button type="button" onClick={nextStep} className="ml-auto">
                  Next
                </Button>
              ) : (
                <Button type="submit" className="ml-auto">
                  Complete Intake
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
