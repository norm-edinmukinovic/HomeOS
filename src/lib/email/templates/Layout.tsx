import { Body, Container, Head, Html, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Body style={{ background: "#FBFAF7", fontFamily: "ui-sans-serif, system-ui, sans-serif", margin: 0, padding: "24px" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", background: "#fff", borderRadius: 12, border: "1px solid #E7E3DB", overflow: "hidden" }}>
          <Section style={{ background: "#2F5D50", padding: "16px 24px" }}>
            <Text style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: 0, letterSpacing: 0.3 }}>Home OS</Text>
          </Section>
          <Section style={{ padding: "24px" }}>{children}</Section>
          <Section style={{ padding: "0 24px 24px" }}>
            <Text style={{ color: "#6B6560", fontSize: 12, margin: 0 }}>
              Ovaj mail mozes iskljuciti u Home OS → Postavke → Obavijesti.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
