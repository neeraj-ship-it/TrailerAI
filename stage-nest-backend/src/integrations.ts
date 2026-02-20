// Initialize Datadog tracing at the top of the file
import tracer from 'dd-trace';
import 'dd-trace/init'; // This should be at the top of your file

const initDataDog = () => {
  tracer.init({ logInjection: true, runtimeMetrics: true });
};

initDataDog();
export default tracer;
