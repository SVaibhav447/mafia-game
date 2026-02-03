export default function RolePreview({ players }) {
  const n = players.length;
  
  const mafia = 1;
  const doctor = n > 6 ? 1 : 0;
  const civilians = n - mafia - doctor;

  return (
    <div className="role-preview">
      <h3>Roles</h3>
      <div className="role-counts">
        <div className="role-count mafia">
          🔪 {mafia} Mafia
        </div>
        {doctor > 0 && (
          <div className="role-count doctor">
            💊 {doctor} Doctor
          </div>
        )}
        <div className="role-count civilian">
          👥 {civilians} Civilian{civilians !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}