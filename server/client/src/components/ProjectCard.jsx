export default function ProjectCard({ project, onClick, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="project-card" onClick={onClick}>
      <div className="project-card-header">
        <div className="project-icon-container">
          <div className="project-icon">📁</div>
        </div>
        <button 
          className="btn-delete-project"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project);
          }}
          title="Xóa project"
        >
          ✕
        </button>
      </div>

      <h3 className="project-title">{project.name}</h3>
      
      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}

      <div className="project-meta">
        <span className="meta-item">📅 Tạo: {formatDate(project.created_at)}</span>
        {project.deadline && (
          <span className="meta-item">⏰ Hạn: {formatDate(project.deadline)}</span>
        )}
      </div>
    </div>
  );
}
