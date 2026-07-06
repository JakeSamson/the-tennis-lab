import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "../../lib/format";
import type { Goal, ProgressLog, CoachNote } from "../development/hooks";
import type { SessionPlan } from "../sessions/hooks";

// Brand palette (PROJECT.md)
const GREEN = "#2d6a4f";
const CLAY = "#e76f51";
const CHARCOAL = "#264653";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: CHARCOAL, fontFamily: "Helvetica" },
  cover: { padding: 0, justifyContent: "center", backgroundColor: GREEN },
  coverInner: { padding: 48, color: "#ffffff" },
  coverBrand: { fontSize: 12, letterSpacing: 2, marginBottom: 120 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  coverSub: { fontSize: 12, opacity: 0.9 },
  coverStripe: { height: 6, backgroundColor: CLAY, marginTop: 24, width: 120 },
  h2: {
    fontSize: 14, fontFamily: "Helvetica-Bold", color: GREEN,
    marginBottom: 8, marginTop: 16, paddingBottom: 3,
    borderBottomWidth: 1, borderBottomColor: GREEN,
  },
  row: { marginBottom: 6 },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#5b6d67" },
  done: { textDecoration: "line-through", color: "#5b6d67" },
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    fontSize: 8, color: "#5b6d67", flexDirection: "row", justifyContent: "space-between",
  },
});

export interface WorkbookData {
  athleteName: string;
  coachName: string;
  goals: Goal[];
  logs: ProgressLog[];
  notes: CoachNote[]; // MUST be pre-filtered to shared_with_athlete only
  plans: SessionPlan[];
  include: { goals: boolean; progress: boolean; notes: boolean; sessions: boolean };
}

function Footer({ athleteName }: { athleteName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>The Tennis Lab — {athleteName}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export default function WorkbookDocument({ data }: { data: WorkbookData }) {
  const { include } = data;
  return (
    <Document title={`${data.athleteName} — Player Workbook`} author={data.coachName}>
      {/* Cover */}
      <Page size="A4" style={[s.page, s.cover]}>
        <View style={s.coverInner}>
          <Text style={s.coverBrand}>THE TENNIS LAB</Text>
          <Text style={s.coverTitle}>{data.athleteName}</Text>
          <Text style={s.coverSub}>Player Development Workbook</Text>
          <Text style={s.coverSub}>Coach {data.coachName} · {formatDate(new Date().toISOString().slice(0, 10))}</Text>
          <View style={s.coverStripe} />
        </View>
      </Page>

      {/* Content */}
      <Page size="A4" style={s.page}>
        {include.goals && (
          <View>
            <Text style={s.h2}>Goals</Text>
            {data.goals.length === 0 && <Text style={s.muted}>No goals recorded yet.</Text>}
            {data.goals.map((g) => (
              <View key={g.id} style={s.row}>
                <Text style={g.status === "achieved" ? s.done : s.itemTitle}>
                  {g.title}{g.status === "achieved" ? "  ✓ achieved" : ""}
                </Text>
                {g.target_date && <Text style={s.muted}>Target: {formatDate(g.target_date)}</Text>}
              </View>
            ))}
          </View>
        )}

        {include.progress && (
          <View>
            <Text style={s.h2}>Progress log</Text>
            {data.logs.length === 0 && <Text style={s.muted}>No progress logged yet.</Text>}
            {data.logs.map((l) => (
              <View key={l.id} style={s.row}>
                <Text>
                  <Text style={s.itemTitle}>{l.metric}</Text>
                  {l.value !== null ? ` — ${l.value}` : ""}  ·  {formatDate(l.log_date)}
                </Text>
                {l.notes && <Text style={s.muted}>{l.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {include.sessions && (
          <View>
            <Text style={s.h2}>Sessions</Text>
            {data.plans.length === 0 && <Text style={s.muted}>No session plans yet.</Text>}
            {data.plans.map((p) => (
              <View key={p.id} style={s.row}>
                <Text><Text style={s.itemTitle}>{p.title}</Text>  ·  {formatDate(p.plan_date)}</Text>
                {p.objectives && <Text style={s.muted}>{p.objectives}</Text>}
              </View>
            ))}
          </View>
        )}

        {include.notes && (
          <View>
            <Text style={s.h2}>Coaching notes</Text>
            {data.notes.length === 0 && <Text style={s.muted}>No shared notes yet.</Text>}
            {data.notes.map((n) => (
              <View key={n.id} style={s.row}>
                <Text style={s.muted}>{formatDate(n.note_date)}</Text>
                <Text>{n.body}</Text>
              </View>
            ))}
          </View>
        )}

        <Footer athleteName={data.athleteName} />
      </Page>
    </Document>
  );
}
