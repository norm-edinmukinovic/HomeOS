import { Text, Hr } from "@react-email/components";
import { Layout } from "./Layout";

export function DigestEmail({ name, items }: { name: string; items: string[] }) {
  return (
    <Layout>
      <Text style={{ fontSize: 18, fontWeight: 600, color: "#14110F", margin: "0 0 8px" }}>Sta danas dolazi</Text>
      <Text style={{ fontSize: 15, color: "#14110F", margin: "0 0 8px" }}>Dobro jutro {name},</Text>
      <Hr style={{ borderColor: "#E7E3DB" }} />
      {items.length === 0 ? (
        <Text style={{ fontSize: 15, color: "#6B6560" }}>Nema nista zakazano za danas. Uzivaj.</Text>
      ) : (
        items.map((it, i) => (
          <Text key={i} style={{ fontSize: 15, color: "#14110F", margin: "6px 0" }}>• {it}</Text>
        ))
      )}
    </Layout>
  );
}
