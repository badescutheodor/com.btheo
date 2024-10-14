import { useLocation, useNavigate, Location, NavigateFunction } from 'react-router-dom';
import { useRouter as useNextRouter, NextRouter } from 'next/router';

export const isNextJs = (): boolean => 
  typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;

export type RouterCompat = NextRouter | { 
  location: Location; 
  navigate: NavigateFunction;
  pathname: string;
  getQueryParams: () => Record<string, string>;
};

export const useRouterCompat = (): RouterCompat => {
  if (isNextJs()) {
    return useNextRouter();
  } else {
    const location = useLocation();
    const navigate = useNavigate();
    return { 
      location, 
      navigate,
      pathname: location.pathname
    };
  }
};

export const updateUrlQueryCompat = (
  router: RouterCompat,
  options: Record<string, any>
): void => {
  const { newPage, filters } = options;
  const queryParams = new URLSearchParams(filters);

  if (newPage !== 1) {
    queryParams.set('page', newPage.toString());
  } else {
    queryParams.delete('page');
  }

  const newUrl = `?${queryParams.toString()}`;

  if (isNextJs()) {
    const nextRouter = router as NextRouter;
    nextRouter.push(
      { 
        pathname: nextRouter.pathname, 
        query: Object.fromEntries(queryParams) 
      }, 
      undefined, 
      { shallow: true }
    );
  } else {
    const reactRouter = router as { navigate: NavigateFunction; pathname: string };
    reactRouter.navigate({
      pathname: reactRouter.pathname,
      search: newUrl,
    });
  }
};

export const getQueryParams = (router: RouterCompat | NextRouter): Record<string, string> => {
  if (isNextJs()) {
    const nextRouter = router as NextRouter;
    return Object.fromEntries(
      Object.entries(nextRouter.query).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value
      ])
    );
  } else {
    return (router as RouterCompat).getQueryParams();
  }
};