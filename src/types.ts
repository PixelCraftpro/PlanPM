export interface Task {
  id: string
  orderNo: string
  resource: string
  startTime: Date
  endTime: Date
  qty?: number
  lane?: number
}

export interface RouteConnection {
  from: Task
  to: Task
}