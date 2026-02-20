import QS from 'node:querystring';

export const VisionularURLBuilder = {
  createTranscodingTask: () => '/vodencoding/v1/create_task',
  getTranscodingTaskStatus: (taskId: string) =>
    `/vodencoding/v1/query_task?task_id=${taskId}`,
  listTemplates: () => '/vodencoding/v1/list_template',
  listTranscodingTasks: ({
    endTime,
    limit = 10,
    skip = 0,
    startTime,
    status,
  }: {
    startTime: Date;
    endTime: Date;
    status?:
      | null
      | 'pending'
      | 'running'
      | 'downloading'
      | 'uploading'
      | 'succeeded'
      | 'failed';
    skip?: number;
    limit?: number;
  }) => {
    const qs = QS.stringify({
      end_time: endTime.getTime(),
      limit,
      skip,
      start_time: startTime.getTime(),
      status,
    });
    return `/vodencoding/v1/list_task?${qs}`;
  },
};
