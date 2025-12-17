import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaTrashAlt } from "react-icons/fa"; // 1. Import Icon thùng rác

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
          <Droppable key={id} droppableId={id} isDropDisabled={!isDraggable}>
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
                {/* Header Cột */}
                <div className="column-header" style={{color: col.color}}>
                  <span>{col.title}</span>
                  <span style={{background:'rgba(0,0,0,0.05)', padding:'2px 8px', borderRadius:'12px', fontSize:'11px'}}>
                    {col.items.length}
                  </span>
                </div>
                
                {/* Danh sách Task */}
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
                          opacity: snapshot.isDragging ? 1 : 1,
                          position: 'relative' // Quan trọng để nút xóa nằm đè lên góc
                        }}
                      >
                        {/* 2. Nút Xóa (Hình thùng rác) */}
                        <button 
                          className="btn-delete-mini" 
                          onClick={(e) => { e.stopPropagation();
                            if(onDeleteClick) onDeleteClick(task); }}
                          title="Xóa công việc"
                        >
                          <FaTrashAlt size={15} />
                        </button>

                        {/* Thông tin Task */}
                        <div className="task-meta">
                          <span className={`badge badge-${task.priority || 'medium'}`}>
                            {task.priority === 'high' ? 'Cao' : task.priority === 'low' ? 'Thấp' : 'TB'}
                          </span>
                          {task.deadline && <span className="task-date">📅 {formatDate(task.deadline)}</span>}
                          {task.project_name && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>📁 {task.project_name}</span>}
                        </div>
                        
                        {/* Tiêu đề task (Thêm padding phải để không bị dính vào nút xóa) */}
                        <div className="task-content" style={{ marginTop: '8px', paddingRight: '25px' }}>
                            {task.title}
                        </div>
                        
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