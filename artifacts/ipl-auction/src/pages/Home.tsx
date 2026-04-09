import React from "react";
import { useGetTeams, useStartAuction, type Team } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: teams, isLoading: isLoadingTeams } = useGetTeams();
  const startAuction = useStartAuction();

  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [budget, setBudget] = React.useState<number>(100);
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");

  const handleStart = () => {
    if (!selectedTeamId) return;
    startAuction.mutate(
      {
        data: {
          userTeamId: selectedTeamId,
          budget: budget,
          difficulty: difficulty,
        },
      },
      {
        onSuccess: () => {
          setLocation("/auction");
        },
      }
    );
  };

  if (isLoadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen container max-w-4xl mx-auto py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold tracking-tighter uppercase">IPL AUCTION SIMULATOR</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Initialise Session</p>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="uppercase text-sm tracking-wider">Select Franchise</CardTitle>
              <CardDescription>Choose the team you want to manage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {teams?.map((team: Team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`flex flex-col items-center p-4 border rounded-md transition-all ${
                      selectedTeamId === team.id
                        ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        : "border-border hover:border-muted-foreground bg-background"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full mb-3 flex items-center justify-center text-xs font-bold text-white shadow-inner"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.shortName}
                    </div>
                    <span className="text-xs font-medium text-center truncate w-full">{team.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="uppercase text-sm tracking-wider">Auction Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-4xl font-bold font-mono tracking-tight text-primary">
                ₹{budget} <span className="text-lg text-muted-foreground">Cr</span>
              </div>
              <Slider
                value={[budget]}
                onValueChange={(v) => setBudget(v[0])}
                min={50}
                max={200}
                step={5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>50 Cr</span>
                <span>200 Cr</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="uppercase text-sm tracking-wider">Rival AI Aggression</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 rounded-md border border-border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="easy" id="easy" />
                  <Label htmlFor="easy" className="flex flex-col cursor-pointer">
                    <span className="font-bold">Conservative</span>
                    <span className="text-xs text-muted-foreground mt-1">AI rarely overbids base price.</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border border-border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="flex flex-col cursor-pointer">
                    <span className="font-bold">Balanced</span>
                    <span className="text-xs text-muted-foreground mt-1">Realistic market values.</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border border-border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="hard" id="hard" />
                  <Label htmlFor="hard" className="flex flex-col cursor-pointer">
                    <span className="font-bold">Aggressive</span>
                    <span className="text-xs text-muted-foreground mt-1">Ruthless bidding wars.</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full text-lg h-14 font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(255,180,0,0.4)]"
            disabled={!selectedTeamId || startAuction.isPending}
            onClick={handleStart}
          >
            {startAuction.isPending ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "ENTER AUCTION ROOM"}
          </Button>
        </div>
      </div>
    </div>
  );
}
