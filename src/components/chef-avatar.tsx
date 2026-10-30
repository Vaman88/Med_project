import type { Family } from "@/lib/little-kitchen";

export function ChefAvatar({
  avatar,
  size = "large",
}: {
  avatar?: Family["avatar"];
  size?: "small" | "large";
}) {
  const look = avatar ?? { skin: "tan", hair: "curly", apron: "coral" };
  return (
    <div
      className={`chef-avatar chef-avatar-${size} skin-${look.skin} hair-${look.hair} apron-${look.apron}`}
      role="img"
      aria-label="Your smiling chef avatar"
    >
      <div className="chef-hat">
        <i />
        <i />
        <i />
      </div>
      <div className="chef-hair" />
      <div className="chef-face">
        <span className="chef-eye left" />
        <span className="chef-eye right" />
        <span className="chef-smile" />
      </div>
      <div className="chef-body">
        <div className="chef-apron" />
      </div>
    </div>
  );
}
