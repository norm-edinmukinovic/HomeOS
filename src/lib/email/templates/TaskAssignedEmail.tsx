import { Text, Button } from "@react-email/components";
import { Layout } from "./Layout";

export function TaskAssignedEmail({ name, title, dueLabel, url }: {
  name: string; title: string; dueLabel?: string; url: string;
}) {
  return (
    <Layout>
      <Text style={{ fontSize: 18, fontWeight: 600, color: "#14110F", margin: "0 0 8px" }}>Dodijeljen ti je zadatak</Text>
      <Text style={{ fontSize: 15, color: "#14110F", margin: "0 0 16px" }}>
        {name}, dodijeljen ti je: <strong>{title}</strong>{dueLabel ? ` — rok ${dueLabel}` : ""}.
      </Text>
      <Button href={url} style={{ background: "#2F5D50", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 14 }}>
        Pogledaj zadatak
      </Button>
    </Layout>
  );
}
