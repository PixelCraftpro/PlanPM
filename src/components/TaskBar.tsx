import React from 'react'
import { motion } from 'framer-motion'
import { Task } from '../types'
import { hashColor, getContrastText } from '../utils/colorUtils'

interface TaskBarProps {
  task: Task
  x: number
  y: number
  width: number
  height: number
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const TaskBar: React.FC<TaskBarProps> = ({
  task,
  x,
  y,
  width,
  height,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const bgColor = hashColor(task.resource)
  const textColor = getContrastText(bgColor)
  
  // Determine label based on width
  const labelFull = `${task.orderNo} • ${task.resource}${task.qty ? ' • ' + task.qty : ''}`
  const labelShort = task.orderNo
  const useShort = width < 80
  
  return (
    <motion.div
      className="absolute rounded cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={useShort ? labelFull : undefined}
    >
      <div className="absolute inset-0 px-2 flex items-center pointer-events-none">
        <span
          className={`font-semibold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-[11px] md:text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]`}
          style={{ color: textColor }}
        >
          {useShort ? labelShort : labelFull}
        </span>
      </div>
    </motion.div>
  )
}