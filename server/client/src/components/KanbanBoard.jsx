import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function KanbanBoard({ 
  columns, 
  onDragEnd, 
  onTaskClick, 
  onDeleteClick, 
  formatDate,
  isDraggable = true
}) {
  return (
    <DragDropContext onDragEnd={isDraggable ? onDragEnd : () => {}}>
      <div className="kanban-board">
        {Object.entries(columns).map(([id, col]) => (
          <Droppable key={id} droppableId={id}>
            {(provided, snapshot) => (
              <div 
                className="kanban-column" 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                style={{
                  backgroundColor: snapshot.isDraggingOver ? '#e0e7ff' : undefined,
                  transition: 'background-color 0.2s ease'
                }}
              >
                <div className="column-header" style={{color: col.color}}>
                  <span>{col.title}</span>
                  <span style={{background:'rgba(0,0,0,0.05)', padding:'2px 8px', borderRadius:'12px', fontSize:'11px'}}>
                    {col.items.length}
                  </span>
                </div>
                
                {col.items.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id.toString()} index={index} isDragDisabled={!isDraggable}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        {...provided.dragHandleProps} 
                        className="task-card" 
                        onClick={() => onTaskClick(task)}
                        data-is-dragging={snapshot.isDragging}
                        style={{
                          ...provided.draggableProps.style, 
                          borderLeft: `4px solid ${col.color}`, 
                          opacity: snapshot.isDragging ? 1 : 1 
                        }}
                      >
                        <div className="task-meta">
                          <span className={`badge badge-${task.priority || 'medium'}`}>
                            {task.priority === 'high' ? 'Cao' : task.priority === 'low' ? 'Thấp' : 'TB'}
                          </span>
                          {task.deadline && <span className="task-date">📅 {formatDate(task.deadline)}</span>}
                          {task.project_name && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>📁 {task.project_name}</span>}
                        </div>
                        
                        <div className="task-content">{task.title}</div>
                        
                        <button 
                          className="btn-delete-mini" 
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(task); }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
