import { Text, Button } from "@react-email/components";
import { Layout } from "./Layout";

export function BillDueEmail({ name, title, amount, dueLabel, url }: {
  name: string; title: string; amount: number; dueLabel: string; url: string;
}) {
  return (
    <Layout>
      <Text style={{ fontSize: 18, fontWeight: 600, color: "#14110F", margin: "0 0 8px" }}>
        Racun uskoro dospijeva
      </Text>
      <Text style={{ fontSize: 15, color: "#14110F", margin: "0 0 4px" }}>Bok {name},</Text>
      <Text style={{ fontSize: 15, color: "#14110F", margin: "0 0 16px" }}>
        <strong>{title}</strong> ({amount.toFixed(2)} KM) dospijeva {dueLabel}.
      </Text>
      <Button href={url} style={{ background: "#2F5D50", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 14 }}>
        Otvori u Home OS
      </Button>
    </Layout>
  );
}
