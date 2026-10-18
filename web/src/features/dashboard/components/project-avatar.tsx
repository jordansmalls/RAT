import styles from "./dashboard.module.css";

const gradients = [
  "linear-gradient(135deg, #6366F1, #8B5CF6)",
  "linear-gradient(135deg, #EC4899, #A21CAF)",
  "linear-gradient(135deg, #0EA5E9, #1E3A8A)",
  "linear-gradient(135deg, #F59E0B, #B45309)",
  "linear-gradient(135deg, #EF4444, #9F1239)",
  "linear-gradient(135deg, #06B6D4, #4338CA)",
  "linear-gradient(135deg, #10B981, #065F46)",
  "linear-gradient(135deg, #D946EF, #86198F)",
  "linear-gradient(135deg, #F97316, #7C2D12)",
  "linear-gradient(135deg, #3B82F6, #1E1B4B)",
  "linear-gradient(135deg, #14B8A6, #164E63)",
  "linear-gradient(135deg, #E11D48, #581C87)",
];
export function ProjectAvatar({ id, name }: { id: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (
    <span className={styles.projectMark} style={{ background: gradients[hash % gradients.length] }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
