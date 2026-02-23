import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSubscription } from "@/lib/use-subscription";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Palette,
  LayoutGrid,
  Award,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaywallBadge } from "./PaywallBadge";
import { ProfileBadgeSlot, type BadgeData } from "./ProfileBadgeSlot";
import { useGrayscaleMedia } from "@/lib/grayscale-media-context";
import { cn } from "@/lib/utils";

export type ProfileSettings = {
  bannerUrl?: string | null;
  bannerPosition?: string | null;
  themeAccent?: string | null;
  themeCustomColor?: string | null;
  layoutOrder?: string[] | null;
  avatarFrameId?: string | null;
  pronouns?: string | null;
  aboutMe?: string | null;
  showBadges?: boolean | null;
};

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    displayName: string;
    bio?: string | null;
    username: string;
  };
  profileSettings: ProfileSettings | null;
  badges: (BadgeData & { earnedAt?: string })[];
  onSuccess?: () => void;
}

const SECTION_IDS = ["favorites", "watchlist", "activity"] as const;
const THEME_OPTIONS = [
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "blue", label: "Blue" },
  { value: "emerald", label: "Emerald" },
  { value: "custom", label: "Custom" },
];

export function ProfileEditSheet({
  open,
  onOpenChange,
  user,
  profileSettings,
  badges,
  onSuccess,
}: ProfileEditSheetProps) {
  const { data: allBadges = [] } = useQuery<BadgeData[]>({
    queryKey: ["/api/badges"],
    enabled: open,
  });
  const queryClient = useQueryClient();
  const { isPro } = useSubscription();
  const { grayscaleMedia, setGrayscaleMedia } = useGrayscaleMedia();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [pronouns, setPronouns] = useState(profileSettings?.pronouns ?? "");
  const [bannerUrl, setBannerUrl] = useState(profileSettings?.bannerUrl ?? "");
  const [themeAccent, setThemeAccent] = useState(
    profileSettings?.themeAccent ?? "amber"
  );
  const [layoutOrder, setLayoutOrder] = useState<string[]>(
    (profileSettings?.layoutOrder as string[]) ?? [...SECTION_IDS]
  );

  useEffect(() => {
    setDisplayName(user.displayName);
    setBio(user.bio ?? "");
  }, [user.displayName, user.bio]);

  useEffect(() => {
    setPronouns(profileSettings?.pronouns ?? "");
    setBannerUrl(profileSettings?.bannerUrl ?? "");
    setThemeAccent(profileSettings?.themeAccent ?? "amber");
    setLayoutOrder(
      (profileSettings?.layoutOrder as string[]) ?? [...SECTION_IDS]
    );
  }, [profileSettings, open]);

  const userMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string }) => {
      await apiRequest("PATCH", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/username/${user.username}`] });
      onSuccess?.();
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest(
        "PATCH",
        `/api/users/${user.id}/profile-settings`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/username/${user.username}`] });
      onSuccess?.();
    },
  });

  const handleSaveBasics = () => {
    userMutation.mutate({ displayName, bio });
    settingsMutation.mutate({ pronouns: pronouns || null });
  };

  const handleSaveAppearance = () => {
    if (!isPro) return;
    settingsMutation.mutate({ bannerUrl: bannerUrl || null, themeAccent });
  };

  const handleSaveLayout = () => {
    if (!isPro) return;
    settingsMutation.mutate({ layoutOrder });
  };

  const moveSection = (index: number, dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0 || next >= layoutOrder.length) return;
    const nextOrder = [...layoutOrder];
    [nextOrder[index], nextOrder[next]] = [nextOrder[next], nextOrder[index]];
    setLayoutOrder(nextOrder);
  };

  const sectionLabels: Record<string, string> = {
    favorites: "Favorites",
    watchlist: "Watchlist",
    activity: "Activity",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Customize your profile appearance and preferences.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basics" className="mt-4 flex flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics" className="text-xs">
              Basics
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="mr-1 h-3 w-3" />
              Style
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              <LayoutGrid className="mr-1 h-3 w-3" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="badges" className="text-xs">
              <Award className="mr-1 h-3 w-3" />
              Badges
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex-1 overflow-y-auto">
            <TabsContent value="basics" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronouns">Pronouns</Label>
                <Input
                  id="pronouns"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="e.g. she/her, he/him, they/them"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-card/60 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="grayscale-media" className="text-sm font-medium">
                    Show media in black & white
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Apply grayscale to cover images and posters.
                  </p>
                </div>
                <Switch
                  id="grayscale-media"
                  checked={grayscaleMedia}
                  onCheckedChange={setGrayscaleMedia}
                />
              </div>
              <Button
                onClick={handleSaveBasics}
                disabled={userMutation.isPending || settingsMutation.isPending}
              >
                Save basics
              </Button>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-4">
              {!isPro && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <PaywallBadge label="Upgrade to Pro to customize banner and theme" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bannerUrl" className="flex items-center gap-2">
                  Banner URL
                  {!isPro && <PaywallBadge />}
                </Label>
                <Input
                  id="bannerUrl"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  disabled={!isPro}
                  className={cn(!isPro && "opacity-60")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="themeAccent" className="flex items-center gap-2">
                  Theme accent
                  {!isPro && <PaywallBadge />}
                </Label>
                <Select
                  value={themeAccent}
                  onValueChange={setThemeAccent}
                  disabled={!isPro}
                >
                  <SelectTrigger className={cn(!isPro && "opacity-60")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isPro && (
                <Button
                  onClick={handleSaveAppearance}
                  disabled={settingsMutation.isPending}
                >
                  Save appearance
                </Button>
              )}
            </TabsContent>

            <TabsContent value="layout" className="mt-0 space-y-4">
              {!isPro && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <PaywallBadge label="Upgrade to Pro to customize section order" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Choose the order of sections on your profile.
              </p>
              <div className="space-y-2">
                {layoutOrder.map((id, i) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-3"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {sectionLabels[id] ?? id}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!isPro || i === 0}
                        onClick={() => moveSection(i, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!isPro || i === layoutOrder.length - 1}
                        onClick={() => moveSection(i, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {isPro && (
                <Button
                  onClick={handleSaveLayout}
                  disabled={settingsMutation.isPending}
                >
                  Save layout
                </Button>
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Earn badges by using the app. Your earned badges will appear here.
              </p>
              <div className="flex flex-wrap gap-2">
                {badges.length > 0
                  ? badges.map((b) => (
                      <ProfileBadgeSlot key={b.id} badge={b} />
                    ))
                  : allBadges.slice(0, 5).map((b) => (
                      <ProfileBadgeSlot
                        key={b.id}
                        badge={b}
                        isEmpty
                      />
                    ))}
              </div>
              {badges.length === 0 && (!allBadges || allBadges.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No badges available yet. Check back soon!
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
