"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useNarrativeDraftQuery,
  useApproveNarrativeMutation,
  useNarrativeStatusQuery,
} from "@/service/modules/trailer.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Music, Zap, Users, Film } from "lucide-react";
import { toast } from "sonner";

interface StoryBeat {
  order: number;
  act: string;
  beat_type: string;
  description: string;
  emotional_tone: string;
  character_focus?: string;
  key_dialogue?: string;
  timecode_start?: string;
  timecode_end?: string;
  duration: number;
  visual_notes?: string;
}

interface CharacterArc {
  name: string;
  role: string;
  introduction_beat: number;
  key_moments: number[];
  arc_description: string;
  relationships?: Record<string, string>;
}

interface NarrativeDraft {
  project_id: string;
  title: string;
  logline: string;
  story_premise: string;
  genre: string;
  target_duration: number;
  acts: {
    setup: StoryBeat[];
    confrontation: StoryBeat[];
    resolution: StoryBeat[];
  };
  story_beats: StoryBeat[];
  characters: CharacterArc[];
  emotional_arc: string;
  hook_strategy: string;
  cliffhanger: string;
  total_beats: number;
  estimated_duration: number;
  dialogue_coverage: number;
  music_shifts: number[];
  narrative_reasoning: string;
  alternative_approaches: string[];
}

export default function NarrativeReview() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isApproving, setIsApproving] = useState(false);

  // Fetch narrative draft
  const { data: narrativeData, isLoading, error } = useNarrativeDraftQuery(projectId);

  // Check status
  const { data: statusData } = useNarrativeStatusQuery(projectId);

  // Approve mutation
  const approveMutation = useApproveNarrativeMutation();

  const handleApprove = async () => {
    if (!narrativeData?.draft) {
      toast.error("No narrative draft found");
      return;
    }

    setIsApproving(true);
    try {
      const result = await approveMutation.mutateAsync({
        projectId,
        approvedNarrative: narrativeData.draft,
      });

      toast.success("Narrative approved! Trailer generation started.");

      // Redirect to trailer detail page to watch progress
      router.push(`/trailer/${projectId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve narrative");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    toast.info("Narrative rejected. You can generate a new draft.");
    router.push(`/trailer/create`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading narrative draft...</p>
        </div>
      </div>
    );
  }

  if (error || !narrativeData?.draft) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load narrative draft. The draft may not be ready yet.
            {statusData?.phase === 'narrative_draft' && statusData?.status === 'processing' && (
              <div className="mt-2">
                <p>Status: {statusData.message}</p>
                <p className="text-sm mt-1">Please wait while the narrative is being generated...</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/trailer')} className="mt-4">
          Back to Trailers
        </Button>
      </div>
    );
  }

  const draft: NarrativeDraft = narrativeData.draft;

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Narrative Draft Review</h1>
            <p className="text-muted-foreground">
              Review and approve the narrative structure before trailer generation
            </p>
          </div>
          <Badge variant={statusData?.status === 'ready' ? 'default' : 'secondary'}>
            {statusData?.phase || 'narrative_draft'}
          </Badge>
        </div>
        <Separator />
      </div>

      {/* Narrative Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            {draft.title}
          </CardTitle>
          <CardDescription className="text-base italic">
            &quot;{draft.logline}&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Story Premise</h3>
            <p className="text-muted-foreground">{draft.story_premise}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Genre</p>
              <p className="font-medium">{draft.genre}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Beats</p>
              <p className="font-medium">{draft.total_beats}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{draft.estimated_duration.toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dialogue Coverage</p>
              <p className="font-medium">{(draft.dialogue_coverage * 100).toFixed(0)}%</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Emotional Arc</h3>
            <p className="text-muted-foreground">{draft.emotional_arc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Hook Strategy</h3>
              <p className="text-sm text-muted-foreground">{draft.hook_strategy}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cliffhanger</h3>
              <p className="text-sm text-muted-foreground italic">&quot;{draft.cliffhanger}&quot;</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Story Beats by Act */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Story Structure</CardTitle>
          <CardDescription>
            3-act structure with {draft.story_beats.length} narrative beats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">
                Setup ({draft.acts.setup.length} beats)
              </TabsTrigger>
              <TabsTrigger value="confrontation">
                Confrontation ({draft.acts.confrontation.length} beats)
              </TabsTrigger>
              <TabsTrigger value="resolution">
                Resolution ({draft.acts.resolution.length} beats)
              </TabsTrigger>
            </TabsList>

            {Object.entries(draft.acts).map(([actName, beats]) => (
              <TabsContent key={actName} value={actName} className="space-y-4">
                {beats.map((beat) => (
                  <Card key={beat.order} className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            Beat #{beat.order + 1} - {beat.beat_type}
                          </CardTitle>
                          <CardDescription>{beat.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{beat.emotional_tone}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {beat.key_dialogue && (
                        <div className="bg-background p-3 rounded-md border">
                          <p className="text-sm font-medium">Dialogue:</p>
                          <p className="text-sm italic">&quot;{beat.key_dialogue}&quot;</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {beat.timecode_start && (
                          <span>
                            Timecode: {beat.timecode_start} - {beat.timecode_end}
                          </span>
                        )}
                        <span>Duration: {beat.duration.toFixed(1)}s</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Music & Sound Design */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Music & Sound Design
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Music Shifts</h3>
            <div className="space-y-2">
              {draft.music_shifts.map((shiftBeat, idx) => {
                const nextShift = draft.music_shifts[idx + 1] || draft.total_beats;
                const musicStyle =
                  idx === 0 ? "Soft Regional" :
                  idx === 1 ? "Intense Action" :
                  "Emotional Suspense";

                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <Badge variant="secondary">Beat {shiftBeat}-{nextShift}</Badge>
                    <span className="font-medium">{musicStyle}</span>
                    <span className="text-sm text-muted-foreground">
                      ({idx === 0 ? "Opening" : idx === 1 ? "Middle" : "Ending"})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Characters */}
      {draft.characters && draft.characters.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Character Arcs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.characters.map((char, idx) => (
              <div key={idx} className="p-4 bg-muted/30 rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{char.name}</h3>
                  <Badge>{char.role}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{char.arc_description}</p>
                <div className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">Introduced in Beat:</span>
                  <span className="font-medium">{char.introduction_beat}</span>
                  <span className="text-muted-foreground ml-4">Key moments:</span>
                  <span className="font-medium">{char.key_moments.join(", ")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* LLM Reasoning */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Narrative Reasoning</h3>
            <p className="text-sm text-muted-foreground">{draft.narrative_reasoning}</p>
          </div>

          {draft.alternative_approaches && draft.alternative_approaches.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Alternative Approaches Considered</h3>
              <ul className="list-disc list-inside space-y-1">
                {draft.alternative_approaches.map((approach, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{approach}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-t">
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={isApproving}
        >
          Reject & Redraft
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/trailer')}
            variant="ghost"
            disabled={isApproving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            className="min-w-[200px]"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve & Generate Trailer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
