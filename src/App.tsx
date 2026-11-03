import { useEffect, useState, type FormEvent } from "react";
import AuthGate from "./AuthGate";
import { api, auth } from "./api";
import { money } from "./domain.mjs";
type Product = {
  id: string;
  category: string;
  price: number;
  stock: number;
  name: Record<string, string>;
  description: Record<string, string>;
  images?: string[];
};
type State = {
  revision: number;
  settings: {
    headline: Record<string, string>;
    leader: Record<string, string>;
    pricing: Record<string, any>;
  };
  products: Product[];
  closures: {
    id: string;
    kind: string;
    productId: string;
    from: string;
    to: string;
  }[];
  bookings: {
    input: { productId: string; name: string; email: string; quantity: number };
    confirmation: {
      reference: string;
      start: string;
      customerEnd: string;
      total: number;
    };
  }[];
};
const labels: Record<string, string> = {
  packages: "Pulmapaketid",
  half: "Pool päeva",
  full: "Terve päev",
  coordination: "Koordineerimine",
  transport: "Transport",
  local: "Saaremaa / Muhumaa / Tartumaa",
  mainland: "Muu Mandri-Eesti",
  hiiu: "Hiiumaa",
  islands: "Muud saared",
  decor: "Dekoratsioonid",
  mini: "Mini",
  midi: "Midi",
  maxi: "Maxi",
  extraHour: "Lisatund",
  lateHour: "Tund pärast südaööd",
  assistant: "Lisakoordinaator",
  assistantFrom: "Lisakoordinaatori külaliste piir",
  visit: "Kohakülastus",
  website: "Pulmaleht",
  dinner: "Pulmaeelne õhtusöök / külaline",
  partyPoints: "Muude sündmuste hinnapunktid",
  decorationPoints: "Dekoratsioonide hinnapunktid",
};
function numericFields(
  value: any,
  path: string[] = [],
): { path: string[]; value: number }[] {
  return Object.entries(value).flatMap(([key, item]) =>
    typeof item === "number"
      ? [{ path: [...path, key], value: item }]
      : numericFields(item, [...path, key]),
  );
}
function Workspace() {
  const [state, setState] = useState<State>(),
    [tab, setTab] = useState("content"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    await run(async () => {
      setState(await api<State>("/api/site/admin/state"));
      setDirty(false);
    });
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function edit(fn: (s: State) => void) {
    setState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      fn(next);
      return next;
    });
    setDirty(true);
  }
  function selectTab(next: string) {
    if (
      dirty &&
      !window.confirm("Salvestamata muudatused lähevad kaotsi. Jätkan?")
    )
      return;
    setTab(next);
    void refresh();
  }
  async function save(part: "settings" | "products") {
    await run(async () => {
      setState(
        await api<State>("/api/site/admin/" + part, "PUT", {
          revision: state!.revision,
          [part]: state![part],
        }),
      );
      setDirty(false);
      setMessage("Muudatused salvestatud.");
    });
  }
  function submit(
    e: FormEvent<HTMLFormElement>,
    fn: (v: Record<string, string>) => Promise<void>,
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    void run(async () => {
      await fn(
        Object.fromEntries(new FormData(form)) as Record<string, string>,
      );
      form.reset();
      setMessage("Muudatused salvestatud.");
    });
  }
  const p =
    state?.products.find((p) => p.id === selected) || state?.products[0];
  return (
    <div className="shell">
      <aside className="sidebar dark">
        <a className="brand" href="/">
          ehe <small>EVENTS</small>
        </a>
        <p className="eyebrow">VEEBILEHE HALDUS</p>
        <nav className="nav" aria-label="Haldusmenüü">
          {[
            ["content", "Tekstid"],
            ["pricing", "Hinnakalkulaator"],
            ["products", "Renditooted"],
            ["calendar", "Kalendrid"],
            ["bookings", "Broneeringud"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => selectTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <p className="sidebar-bottom">
          EHE Events
          <br />
          Sisu, hinnad ja rendikalender.
        </p>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Veebilehe administraator {dirty ? "· Salvestamata muudatused" : ""}
          </span>
          <button
            className="btn"
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  "Salvestamata muudatused lähevad kaotsi. Jätkan?",
                )
              )
                void auth.signoutRedirect().catch((e) => setError(e.message));
            }}
          >
            Logi välja
          </button>
        </header>
        <div className="content">
          <div className="page-head">
            <div>
              <p className="eyebrow">EHE EVENTS</p>
              <h1>
                {
                  (
                    {
                      content: "Sõnad, mis loovad tunde.",
                      pricing: "Läbimõeldud pakkumised.",
                      products: "Detailid, mis jäävad meelde.",
                      calendar: "Ruumi erilistele päevadele.",
                      bookings: "Kõik kokkulepped koos.",
                    } as Record<string, string>
                  )[tab]
                }
              </h1>
            </div>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Loobun salvestamata muudatustest?")
                )
                  void refresh();
              }}
            >
              Värskenda
            </button>
          </div>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="notice">
              {message}
            </div>
          )}
          {!state ? (
            <p>Laadin…</p>
          ) : (
            <>
              {tab === "content" && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Avaleht ja tutvustus</h2>
                  </div>
                  <form
                    className="panel-body form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save("settings");
                    }}
                  >
                    {["et", "en"].map((l) => (
                      <label key={l}>
                        Avalehe pealkiri ({l.toUpperCase()})
                        <input
                          value={state.settings.headline[l]}
                          required
                          maxLength={300}
                          onChange={(e) =>
                            edit((s) => {
                              s.settings.headline[l] = e.target.value;
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="full">
                      Tutvustuse nimi
                      <input
                        value={state.settings.leader.name}
                        required
                        maxLength={100}
                        onChange={(e) =>
                          edit((s) => {
                            s.settings.leader.name = e.target.value;
                          })
                        }
                      />
                    </label>
                    {["et", "en"].map((l) => (
                      <label key={l}>
                        Tutvustus ({l.toUpperCase()})
                        <textarea
                          value={state.settings.leader[l]}
                          maxLength={10000}
                          onChange={(e) =>
                            edit((s) => {
                              s.settings.leader[l] = e.target.value;
                            })
                          }
                        />
                      </label>
                    ))}
                    <button className="btn primary full" disabled={busy}>
                      Salvesta tekstid
                    </button>
                  </form>
                </section>
              )}
              {tab === "pricing" && (
                <section className="panel">
                  <div className="panel-head">
                    <h2>Kalkulaatori hinnad</h2>
                  </div>
                  <form
                    className="panel-body form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save("settings");
                    }}
                  >
                    {numericFields(state.settings.pricing).map((f) => (
                      <label key={f.path.join(".")}>
                        {f.path.map((x) => labels[x] || x).join(" · ")}
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.01"
                          required
                          value={f.value}
                          onChange={(e) =>
                            edit((s) => {
                              let o: any = s.settings.pricing;
                              f.path.slice(0, -1).forEach((k) => {
                                o = o[k];
                              });
                              o[f.path.at(-1)!] = Number(e.target.value);
                            })
                          }
                        />
                      </label>
                    ))}
                    <p className="subtle full">
                      Kõik hinnad eurodes. Hinnapunktide paarides on 0 külaliste
                      arv ja 1 hind. Külaliste arv peab kasvama.
                    </p>
                    <button className="btn primary full" disabled={busy}>
                      Salvesta hinnad
                    </button>
                  </form>
                </section>
              )}
              {tab === "products" && (
                <>
                  <div className="actions">
                    <label className="field">
                      Vali toode
                      <select
                        value={p?.id || ""}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {state.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name.et}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="btn"
                      onClick={() => {
                        const id = "product-" + crypto.randomUUID();
                        edit((s) =>
                          s.products.push({
                            id,
                            category: "table",
                            name: { et: "Uus toode", en: "New product" },
                            description: { et: "", en: "" },
                            price: 0,
                            stock: 0,
                            images: [],
                          }),
                        );
                        setSelected(id);
                      }}
                    >
                      + Lisa toode
                    </button>
                  </div>
                  {p && (
                    <form
                      className="card form-grid"
                      style={{ marginTop: 20 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save("products");
                      }}
                    >
                      {["et", "en"].map((l) => (
                        <label key={l}>
                          Nimi ({l.toUpperCase()})
                          <input
                            value={p.name[l]}
                            required
                            maxLength={150}
                            onChange={(e) =>
                              edit((s) => {
                                s.products.find((x) => x.id === p.id)!.name[l] =
                                  e.target.value;
                              })
                            }
                          />
                        </label>
                      ))}
                      {["et", "en"].map((l) => (
                        <label key={l}>
                          Kirjeldus ({l.toUpperCase()})
                          <textarea
                            value={p.description[l]}
                            maxLength={10000}
                            onChange={(e) =>
                              edit((s) => {
                                s.products.find(
                                  (x) => x.id === p.id,
                                )!.description[l] = e.target.value;
                              })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        Kategooria
                        <select
                          value={p.category}
                          onChange={(e) =>
                            edit((s) => {
                              s.products.find((x) => x.id === p.id)!.category =
                                e.target.value;
                            })
                          }
                        >
                          <option value="table">Lauakaunistused</option>
                          <option value="large">Suured dekoratsioonid</option>
                          <option value="clothes">Riided</option>
                        </select>
                      </label>
                      <label>
                        36 tunni baashind (€)
                        <input
                          type="number"
                          min="0"
                          max="1000000"
                          step="0.01"
                          value={p.price}
                          onChange={(e) =>
                            edit((s) => {
                              s.products.find((x) => x.id === p.id)!.price =
                                Number(e.target.value);
                            })
                          }
                        />
                      </label>
                      <label>
                        Laokogus
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          value={p.stock}
                          onChange={(e) =>
                            edit((s) => {
                              s.products.find((x) => x.id === p.id)!.stock =
                                Number(e.target.value);
                            })
                          }
                        />
                      </label>
                      <p className="subtle">
                        Toote peitmiseks määra laokoguseks 0. Broneeringud
                        säilivad.
                      </p>
                      <button className="btn primary full" disabled={busy}>
                        Salvesta renditooted
                      </button>
                    </form>
                  )}
                </>
              )}
              {tab === "calendar" && (
                <>
                  <section className="card">
                    <h2>Märgi aeg hõivatuks</h2>
                    <form
                      className="form-grid"
                      onSubmit={(e) =>
                        submit(e, async (v) =>
                          setState(
                            await api<State>(
                              "/api/site/admin/closures",
                              "POST",
                              v,
                            ),
                          ),
                        )
                      }
                    >
                      <label>
                        Kalender
                        <select name="kind">
                          <option value="event">Sündmused</option>
                          <option value="rental">Rent</option>
                        </select>
                      </label>
                      <label>
                        Toode
                        <select name="productId">
                          <option value="all">Kõik tooted</option>
                          {state.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name.et}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Alates
                        <input name="from" type="date" required />
                      </label>
                      <label>
                        Kuni (kaasa arvatud)
                        <input name="to" type="date" required />
                      </label>
                      <button className="btn primary full" disabled={busy}>
                        Sulge kuupäevad
                      </button>
                    </form>
                  </section>
                  <h2 style={{ marginTop: 30 }}>Suletud ajad</h2>
                  {state.closures.map((c) => (
                    <div className="notice" key={c.id}>
                      {c.kind === "event" ? "Sündmused" : "Rent"} · {c.from} –{" "}
                      {c.to} ·{" "}
                      {c.productId === "all"
                        ? "Kõik"
                        : state.products.find((p) => p.id === c.productId)?.name
                            .et}
                      <button
                        className="btn text"
                        disabled={busy}
                        onClick={() =>
                          void run(async () =>
                            setState(
                              await api<State>(
                                "/api/site/admin/closures/" + c.id,
                                "DELETE",
                              ),
                            ),
                          )
                        }
                      >
                        Ava aeg uuesti
                      </button>
                    </div>
                  ))}
                </>
              )}
              {tab === "bookings" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Viide</th>
                        <th>Toode</th>
                        <th>Aeg</th>
                        <th>Kontakt</th>
                        <th>Kokku</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.bookings.map((b) => (
                        <tr key={b.confirmation.reference}>
                          <td>{b.confirmation.reference}</td>
                          <td>
                            {
                              state.products.find(
                                (p) => p.id === b.input.productId,
                              )?.name.et
                            }{" "}
                            × {b.input.quantity}
                          </td>
                          <td>
                            {new Date(b.confirmation.start).toLocaleString(
                              "et-EE",
                              { timeZone: "Europe/Tallinn" },
                            )}
                          </td>
                          <td>
                            {b.input.name}
                            <br />
                            {b.input.email}
                          </td>
                          <td>{money(b.confirmation.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!state.bookings.length && (
                    <p className="empty">Broneeringuid veel ei ole.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
export default function App() {
  return (
    <AuthGate title="Veebilehe haldus">
      <Workspace />
    </AuthGate>
  );
}
