import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FaTrashAlt } from "react-icons/fa"; 
import { useNavigate } from 'react-router-dom';

export default function KanbanBoard({ 
  columns, 
  onDragEnd, 
  onTaskClick, 
  onDeleteClick, 
  formatDate,
  isDraggable = true
}) {
  const navigate = useNavigate();
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
                          position: 'relative' // Để nút xóa nằm đúng vị trí
                        }}
                      >
                        {/* 1. HIỂN THỊ NGUỒN GỐC TASK (Mới thêm) */}
                        <div style={{marginBottom: '8px', fontSize: '11px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          {task.project_name ? (
                              <span 
                                  onClick={(e) => {
                                      e.stopPropagation(); // 1. Chặn click xuyên qua thẻ cha (để k mở modal edit)
                                      navigate(`/projects/${task.project_id}`); // 2. Chuyển hướng sang dự án
                                  }}
                                  style={{
                                      color: '#2563eb', 
                                      background: '#dbeafe', 
                                      padding: '2px 6px', 
                                      borderRadius: '4px',
                                      cursor: 'pointer', // 3. Thêm con trỏ tay để biết là bấm được
                                      transition: '0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} // Hiệu ứng hover nhẹ
                                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                  📁 {task.project_name}
                              </span>
                            ) : (
                                <span style={{color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px'}}>
                                    👤 Cá nhân
                                </span>
                            )}

                            {/* Nút Xóa nằm ở góc phải */}
                            <button 
                              className="btn-delete-mini" 
                              onClick={(e) => { e.stopPropagation(); if(onDeleteClick) onDeleteClick(task); }}
                              title="Xóa công việc"
                            >
                              <FaTrashAlt size={15} />
                            </button>
                        </div>

                        {/* 2. Tiêu đề task */}
                        <div className="task-title" style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                            {task.title}
                        </div>

                        {/* 3. Thông tin phụ (Priority & Deadline) */}
                        <div className="task-meta" style={{display:'flex', gap:'8px', fontSize:'12px', color:'#6b7280'}}>
                          <span className={`badge badge-${task.priority || 'medium'}`}>
                            {task.priority === 'high' ? 'Cao' : task.priority === 'low' ? 'Thấp' : 'TB'}
                          </span>
                          {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
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