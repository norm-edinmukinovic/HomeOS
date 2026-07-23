import { Text, Button } from "@react-email/components";
import { Layout } from "./Layout";

export function InviteEmail({
  inviter, household, url,
}: { inviter: string; household: string; url: string }) {
  return (
    <Layout>
      <Text style={{ fontSize: 18, fontWeight: 600, color: "#2C2A33", margin: "0 0 8px" }}>
        Pozvani ste u domaćinstvo 🏡
      </Text>
      <Text style={{ fontSize: 15, color: "#2C2A33", margin: "0 0 16px" }}>
        <strong>{inviter}</strong> te poziva da se pridružiš domaćinstvu
        {" "}<strong>{household}</strong> na Home OS-u — zajedničkom mjestu za zadatke,
        račune, kalendar i podsjetnike.
      </Text>
      <Text style={{ fontSize: 14, color: "#2C2A33", margin: "0 0 16px" }}>
        Napravi nalog s <strong>ovim istim e-mailom</strong> i automatski ćeš se pridružiti.
      </Text>
      <Button href={url} style={{ background: "#2E9E93", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 14 }}>
        Pridruži se domaćinstvu
      </Button>
    </Layout>
  );
}
