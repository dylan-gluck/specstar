import { useState } from "react";
import { useInput, useApp } from "ink";
import PlanView from "./views/plan-view";

export default function App() {
  const [activePage, setActivePage] = useState("plan");

  const { exit } = useApp();

  useInput((input) => {
    if (input === "p") {
      setActivePage("plan");
    }
    if (input === "o") {
      setActivePage("observe");
    }
    if (input === "q") {
      exit();
    }
  });

  return (
    <>
      {/*{activePage === "observe" && <ObserveView />}*/}
      {activePage === "plan" && <PlanView />}
    </>
  );
}
