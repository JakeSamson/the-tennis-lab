import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Card from "../../components/ui/Card";
import { formatCategory } from "../../lib/format";
import { useProgram, useMyCompletions, useToggleCompletion } from "./hooks";
import ProgramContent from "./ProgramContent";

export default function AthleteProgramPage() {
  const { programId } = useParams<{ programId: string }>();
  const { profile } = useAuth();
  const program = useProgram(programId!);
  const itemIds = program.data?.sections.flatMap((s) => s.items.map((i) => i.id)) ?? [];
  const completions = useMyCompletions(itemIds);
  const toggle = useToggleCompletion(profile!.id);

  const total = itemIds.length;
  const done = completions.data?.size ?? 0;

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="brand">{program.data?.title ?? "Program"}</h1>
        <Link to="/athlete/programs">← My programs</Link>
      </header>
      {program.isError && <Card><p className="error" role="alert">{program.error.message}</p></Card>}
      {toggle.isError && <Card><p className="error" role="alert">{toggle.error.message}</p></Card>}
      {program.data && (
        <>
          <Card>
            <p className="muted">
              {formatCategory(program.data.category)}
              {total > 0 && <> · {done}/{total} complete</>}
            </p>
            {program.data.description && <p>{program.data.description}</p>}
          </Card>
          <ProgramContent
            program={program.data}
            completion={{
              done: completions.data ?? new Set(),
              busy: toggle.isPending,
              onToggle: (itemId, isDone) => toggle.mutate({ itemId, done: isDone }),
            }}
          />
        </>
      )}
    </main>
  );
}
