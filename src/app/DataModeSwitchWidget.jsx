import React from "react";
import { DataModeSwitch } from "../services/dataMode/DataModeSwitch";

export class DataModeSwitchWidget extends React.Component {
  state = {
    mode: DataModeSwitch.getMode(),
  };

  componentDidMount() {
    this.unsubscribe = DataModeSwitch.subscribe((mode) => {
      this.setState({ mode });
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  onToggleMode = () => {
    DataModeSwitch.toggle();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (import.meta.env.VITE_HIDE_DATA_MODE_SWITCH === "true") return null;

    const isNoDatabaseMode = this.state.mode === DataModeSwitch.NO_DATABASE_MODE;
    return (
      <div className="fixed bottom-4 right-4 z-[90] rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Data</span>
          <button
            type="button"
            onClick={this.onToggleMode}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isNoDatabaseMode ? "bg-emerald-500 text-white" : "bg-zinc-900 text-white"}`}
            title="สลับโหมดใช้ฐานข้อมูล / ไม่ใช้ฐานข้อมูล"
          >
            {isNoDatabaseMode ? "NO-DB" : "DB"}
          </button>
        </div>
      </div>
    );
  }
}
