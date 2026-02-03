import { useGameState } from "../core/state";

export default function RoleRevealModal() {
  const { me } = useGameState();

  const roleInfo = {
    mafia: {
      title: "You are MAFIA",
      description: "Kill civilians at night. Pretend to be innocent during the day.",
      color: "#dc2626"
    },
    doctor: {
      title: "You are the DOCTOR",
      description: "Save one person each night from the mafia's attack.",
      color: "#16a34a"
    },
    civilian: {
      title: "You are a CIVILIAN",
      description: "Find and vote out the mafia during the day.",
      color: "#2563eb"
    }
  };

  const info = roleInfo[me?.role] || roleInfo.civilian;

  return (
    <div className="role-reveal-modal">
      <div className="modal-overlay" />
      <div className="modal-content" style={{ borderColor: info.color }}>
        <h1 style={{ color: info.color }}>{info.title}</h1>
        <p>{info.description}</p>
      </div>
    </div>
  );
}