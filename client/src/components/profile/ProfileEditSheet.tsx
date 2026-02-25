import { useState, useEffect, useRef } from "react";
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
  ImagePlus,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import Cropper, { type Area } from "react-easy-crop";
import { PaywallBadge } from "./PaywallBadge";
import { ProfileBadgeSlot, type BadgeData } from "./ProfileBadgeSlot";
import { useGrayscaleMedia } from "@/lib/grayscale-media-context";
import { getCroppedImageCircular } from "@/lib/crop-image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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
    avatarUrl?: string | null;
  };
  profileSettings: ProfileSettings | null;
  badges: (BadgeData & { earnedAt?: string })[];
  onSuccess?: () => void;
}

const SECTION_IDS = ["favorites", "watchlist", "activity"] as const;
const MAX_AVATAR_SIZE_BYTES = 500 * 1024; // 500KB
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

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
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
    setAvatarUrl(user.avatarUrl ?? "");
    setBio(user.bio ?? "");
  }, [user.displayName, user.avatarUrl, user.bio]);

  useEffect(() => {
    setPronouns(profileSettings?.pronouns ?? "");
    setBannerUrl(profileSettings?.bannerUrl ?? "");
    setThemeAccent(profileSettings?.themeAccent ?? "amber");
    setLayoutOrder(
      (profileSettings?.layoutOrder as string[]) ?? [...SECTION_IDS]
    );
  }, [profileSettings, open]);

  const userMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string; avatarUrl?: string }) => {
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
    userMutation.mutate({ displayName, bio, avatarUrl: avatarUrl || undefined });
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

  const handleCropApply = async () => {
    if (!imageToCrop) return;
    const pixels = croppedAreaPixels;
    if (!pixels) return;
    setCropApplying(true);
    try {
      const dataUrl = await getCroppedImageCircular(imageToCrop, pixels);
      setAvatarUrl(dataUrl);
      setImageToCrop(null);
    } catch (err) {
      setAvatarError("Failed to crop image.");
    } finally {
      setCropApplying(false);
    }
  };

  return (
    <>
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
              <fieldset
                className="rounded-lg border border-border bg-card/60 p-4 transition-colors duration-200"
                aria-labelledby="profile-picture-legend"
              >
                <legend
                  id="profile-picture-legend"
                  className="mb-3 flex items-center gap-2 text-sm font-medium"
                >
                  <ImagePlus className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Profile picture
                </legend>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  id="avatar-file"
                  aria-label="Choose profile picture"
                  onChange={(e) => {
                    setAvatarError(null);
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_AVATAR_SIZE_BYTES) {
                      setAvatarError("Image must be under 500 KB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      setImageToCrop(dataUrl);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setCroppedAreaPixels(null);
                    };
                    reader.onerror = () => setAvatarError("Could not read image.");
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Avatar
                      className="h-20 w-20 shrink-0 ring-2 ring-border transition-shadow duration-200"
                      aria-label={avatarUrl ? "Current profile photo" : "No profile photo set"}
                    >
                      <AvatarImage alt={displayName || "Profile"} src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-xl">
                        {(displayName || "?").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-h-[44px] flex-col justify-center gap-2">
                      <Label
                        htmlFor="avatar-file"
                        className="cursor-pointer rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Choose image
                      </Label>
                      <p id="avatarUrl-hint" className="text-xs text-muted-foreground">
                        JPG, PNG, WebP or GIF. Max 500 KB.
                      </p>
                      {avatarError ? (
                        <p className="text-xs text-destructive" role="alert">
                          {avatarError}
                        </p>
                      ) : null}
                      {avatarUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-fit gap-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setAvatarUrl("");
                            setAvatarError(null);
                            if (avatarInputRef.current) avatarInputRef.current.value = "";
                          }}
                          aria-label="Remove profile picture"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                          Remove photo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </fieldset>
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

    <Dialog open={!!imageToCrop} onOpenChange={(open) => !open && setImageToCrop(null)}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden"
        aria-describedby="crop-dialog-description"
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Adjust profile picture</DialogTitle>
          <DialogDescription id="crop-dialog-description">
            Drag to position and pinch or scroll to zoom. The circle shows how it will appear.
          </DialogDescription>
        </DialogHeader>
        {imageToCrop ? (
          <div className="relative h-[min(70vh,400px)] w-full bg-muted">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
              onCropAreaChange={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          </div>
        ) : null}
        <DialogFooter className="flex-row justify-end gap-2 p-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setImageToCrop(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!croppedAreaPixels || cropApplying}
            onClick={handleCropApply}
          >
            {cropApplying ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
